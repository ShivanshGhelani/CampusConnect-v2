import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';
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
import Modal from '../components/ui/Modal';
import { scannerAPI } from '../api/scanner';

const UnifiedQRScanner = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const scannerRef = useRef(null);
  const qrCodeScannerRef = useRef(null);
  
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
  const [showParticipantModal, setShowParticipantModal] = useState(false);
  const [currentParticipant, setCurrentParticipant] = useState(null);
  const [attendanceResult, setAttendanceResult] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
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
        console.error('Error parsing volunteer info:', err);
      }
    }

    // Cleanup scanner on component unmount
    return () => {
      if (qrCodeScannerRef.current) {
        qrCodeScannerRef.current.clear().catch(console.error);
      }
    };
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

  const playNotificationSound = (type = 'success') => {
    try {
      // Create AudioContext for better sound control
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      if (type === 'success') {
        // Play a pleasant success sound (two-tone chime)
        const frequencies = [800, 1000];
        frequencies.forEach((freq, index) => {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
          oscillator.type = 'sine';
          
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
          
          oscillator.start(audioContext.currentTime + index * 0.15);
          oscillator.stop(audioContext.currentTime + 0.3 + index * 0.15);
        });
      } else {
        // Play a warning sound for errors/duplicates
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
        oscillator.type = 'triangle';
        
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
      }
    } catch (error) {
      // Fallback to system beep if AudioContext fails
      
    }
  };

  const handleScanSuccess = async (decodedText, decodedResult) => {
    console.log('QR Scanner: Scan success triggered');
    console.log('QR Scanner: Decoded text:', decodedText);
    console.log('QR Scanner: Decoded result:', decodedResult);
    
    // Prevent duplicate processing of the same QR code
    if (decodedText === lastResult) {
      console.log('QR Scanner: Duplicate scan detected, ignoring');
      return;
    }
    
    setLastResult(decodedText);
    
    if (!volunteerInfo || !volunteerInfo.name || !volunteerInfo.email) {
      showNotification('Volunteer information missing. Please refresh and try again.', 'error');
      playNotificationSound('error');
      return;
    }

    // Stop the scanner immediately to prevent multiple scans
    if (qrCodeScannerRef.current) {
      try {
        await qrCodeScannerRef.current.clear();
        setIsScanning(false);
      } catch (err) {
        console.warn('Error stopping scanner:', err);
      }
    }

    try {
      setIsProcessing(true);
      console.log('QR Scanner: Processing QR code...');
      
      // First parse and validate the QR code data
      let qrData;
      try {
        qrData = JSON.parse(decodedText);
        console.log('QR Scanner: Parsed QR data:', qrData);
      } catch (parseError) {
        console.error('QR Scanner: Parse error:', parseError);
        showNotification('Invalid QR code format - not valid JSON', 'error');
        playNotificationSound('error');
        return;
      }

      // Validate event ID matches current scanner event
      if (qrData.event_id !== eventInfo?.event_id) {
        console.error('QR Scanner: Event ID mismatch:', qrData.event_id, 'vs', eventInfo?.event_id);
        showNotification(`QR code is for different event: ${qrData.event_name || 'Unknown'}`, 'error');
        playNotificationSound('error');
        return;
      }

      // Validate QR data structure - check for required fields
      if (!qrData.registration_id || !qrData.user_type || !qrData.type) {
        console.error('QR Scanner: Missing required fields:', {
          registration_id: qrData.registration_id,
          user_type: qrData.user_type,
          type: qrData.type
        });
        showNotification('Invalid QR code format - missing required fields', 'error');
        playNotificationSound('error');
        return;
      }

      console.log('QR Scanner: Valid QR data received:', qrData);

      // Show participant data first, then allow marking
      setCurrentParticipant(qrData);
      setShowParticipantModal(true);
      playNotificationSound('success');
      
    } catch (err) {
      console.error('QR Scanner: Error processing QR code:', err);
      showNotification('Error processing QR code', 'error');
      playNotificationSound('error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleScanFailure = (error) => {
    // Don't log every scan failure as it's normal when there's no QR code visible
    if (error.includes('NotFoundException')) {
      // This is normal - no QR code in view
      return;
    }
    console.warn('QR Scanner: Scan failure:', error);
  };

  const markAttendance = async (memberIndex = null) => {
    if (!currentParticipant) return;

    try {
      setIsProcessing(true);
      
      // Use the new attendance API endpoint
      const response = await fetch('/api/v1/attendance/mark', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_id: currentParticipant.event_id,
          registration_id: currentParticipant.registration_id,
          user_type: currentParticipant.user_type,
          scanner_token: token,
          volunteer_name: volunteerInfo.name,
          volunteer_contact: volunteerInfo.email,
          volunteer_role: volunteerInfo.role || 'Volunteer',
          member_index: memberIndex, // For team member marking
          // Include the full QR data for context
          qr_data: currentParticipant
        }),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        const participant = data.data.participant;
        const attendance_status = data.data.status || data.data.attendance_status;
        const attendance_record = data.data.attendance_record;
        
        // Store attendance result for success modal
        setAttendanceResult({
          participant,
          attendance_record,
          attendance_status,
          member_index: memberIndex,
          timestamp: new Date().toISOString()
        });
        
        if (attendance_status === 'already_marked' || attendance_status === 'duplicate') {
          showNotification(
            `${participant.name || currentParticipant.user?.name} - Attendance already marked`, 
            'warning'
          );
          playNotificationSound('warning');
        } else if (attendance_status === 'success' || attendance_status === 'marked') {
          // Success - show detailed confirmation
          let confirmationMessage = `✅ ${participant.name || currentParticipant.user?.name} marked present`;
          if (participant.department) confirmationMessage += ` (${participant.department})`;
          
          showNotification(confirmationMessage, 'success');
          playNotificationSound('success');
          
          // Add to scan history
          setScanHistory(prev => [{
            participant,
            attendance_record,
            attendance_status,
            member_index: memberIndex,
            timestamp: new Date().toISOString(),
            marked_by: volunteerInfo.name,
            status: 'success'
          }, ...prev.slice(0, 49)]);
        } else {
          showNotification(data.message || 'Unexpected response from server', 'error');
          playNotificationSound('error');
        }
        
        // Close participant modal and show success modal
        setShowParticipantModal(false);
        setShowSuccessModal(true);
      } else {
        showNotification(data.message || data.detail || 'Failed to mark attendance', 'error');
        playNotificationSound('error');
      }
    } catch (err) {
      
      showNotification('Network error. Please check connection.', 'error');
      playNotificationSound('error');
    } finally {
      setIsProcessing(false);
    }
  };

  const initializeScanner = async () => {
    try {
      console.log('QR Scanner: Initializing scanner...');
      
      // Check camera permission first
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop()); // Stop the test stream
      
      // Clean up any existing scanner
      if (qrCodeScannerRef.current) {
        await qrCodeScannerRef.current.clear();
      }

      // Create new scanner
      const scanner = new Html5QrcodeScanner(
        "qr-scanner-container", // Element ID
        {
          fps: 10, // Frames per second for scanning
          qrbox: { width: 250, height: 250 }, // Scanning box size
          aspectRatio: 1.0,
          showTorchButtonIfSupported: true, // Show flashlight if available
          showZoomSliderIfSupported: true, // Show zoom if available
          defaultZoomValueIfSupported: 2, // Default zoom level
        },
        false // Don't show scanning log in console
      );

      qrCodeScannerRef.current = scanner;
      
      // Start scanning
      scanner.render(handleScanSuccess, handleScanFailure);
      
      setIsScanning(true);
      showNotification('Scanner started. Point your camera at a QR code.', 'success');
      console.log('QR Scanner: Scanner started successfully');
      
    } catch (error) {
      console.error('QR Scanner: Error initializing scanner:', error);
      showNotification('Camera access is required for scanning QR codes. Please allow camera access.', 'error');
    }
  };

  const stopScanning = async () => {
    console.log('QR Scanner: Stopping scanner...');
    
    if (qrCodeScannerRef.current) {
      try {
        await qrCodeScannerRef.current.clear();
        qrCodeScannerRef.current = null;
        console.log('QR Scanner: Scanner stopped successfully');
      } catch (error) {
        console.error('QR Scanner: Error stopping scanner:', error);
      }
    }
    
    setIsScanning(false);
    setLastResult(''); // Reset last result
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

                {/* HTML5 QR Scanner Container */}
                <div className="relative">
                  <div 
                    id="qr-scanner-container" 
                    className="w-full"
                    style={{ minHeight: '400px' }}
                  ></div>
                  
                  {isProcessing && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg z-10">
                      <div className="bg-white rounded-lg p-4 flex items-center gap-3">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <span className="text-gray-700">Processing QR Code...</span>
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
                
                <div className="text-xs text-gray-500 space-y-1">
                  <p>• The scanner will automatically detect QR codes</p>
                  <p>• Make sure QR code is clearly visible in the scanning area</p>
                  <p>• Use the torch button if available for better lighting</p>
                </div>
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
                        {scan.participant?.name || 'Unknown'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatTime(scan.timestamp)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600">
                      {scan.status === 'success' ? (
                        <>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                            {scan.participant?.user_type?.toUpperCase() || 'PARTICIPANT'}
                          </span>
                          {scan.participant?.department && (
                            <span className="text-gray-600">{scan.participant.department}</span>
                          )}
                          {scan.participant?.enrollment_no && (
                            <span className="text-gray-600"> • ID: {scan.participant.enrollment_no}</span>
                          )}
                          {scan.participant?.employee_id && (
                            <span className="text-gray-600"> • ID: {scan.participant.employee_id}</span>
                          )}
                          {scan.attendance_record && (
                            <div className="mt-1 text-xs text-indigo-600">
                              Record ID: {scan.attendance_record.attendance_id || scan.attendance_record.id}
                            </div>
                          )}
                          <br />
                          Status: <span className="font-medium text-green-600">
                            {scan.attendance_status === 'already_marked' || scan.attendance_status === 'duplicate' ? 
                              'Already Marked' : 'Marked Present'}
                          </span>
                          <span className="text-gray-500"> • Marked by: {scan.marked_by}</span>
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

      {/* Participant Information Modal */}
      <Modal
        isOpen={showParticipantModal}
        onClose={() => {
          setShowParticipantModal(false);
          setCurrentParticipant(null);
        }}
        title="Participant Information"
        size="lg"
        headerIcon={<UserCheck className="w-5 h-5" />}
      >
        {currentParticipant && (
          <div className="space-y-6">
            {/* Event Validation */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <h4 className="font-medium text-green-800">Valid QR Code</h4>
                  <p className="text-sm text-green-700">
                    Event: {currentParticipant.event_name || eventInfo?.event_name}
                  </p>
                </div>
              </div>
            </div>

            {/* Participant Details */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                {currentParticipant.type === 'team' ? (
                  <Users className="w-5 h-5 text-blue-500" />
                ) : (
                  <UserCheck className="w-5 h-5 text-green-500" />
                )}
                {currentParticipant.type === 'team' ? 'Team Registration' : 'Individual Registration'}
              </h4>

              {currentParticipant.type === 'team' ? (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h5 className="font-semibold text-blue-900 mb-2">Team: {currentParticipant.team_name}</h5>
                    <div className="text-sm text-blue-800">
                      <p>Team Size: {currentParticipant.team_size} members</p>
                      <p>Registration ID: {currentParticipant.registration_id}</p>
                      <p>User Type: {currentParticipant.user_type}</p>
                    </div>
                  </div>

                  {/* Team Leader */}
                  {currentParticipant.team_leader && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="p-4 border-b border-purple-200">
                        <h5 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Team Leader
                        </h5>
                      </div>
                      <div className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900">{currentParticipant.team_leader.name}</div>
                            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mt-2">
                              <div>
                                <p>Enrollment: <span className="font-mono">{currentParticipant.team_leader.enrollment_no}</span></p>
                                <p>Department: {currentParticipant.team_leader.department}</p>
                              </div>
                              <div>
                                <p>Email: {currentParticipant.team_leader.email}</p>
                                <p>Phone: {currentParticipant.team_leader.phone}</p>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => markAttendance('leader')}
                            disabled={isProcessing}
                            className="ml-4 px-4 py-2 bg-green-100 text-green-700 hover:bg-green-200 border border-green-200 rounded-lg font-medium transition-colors disabled:opacity-50"
                          >
                            {isProcessing ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                            ) : (
                              'Mark Present'
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Team Members */}
                  {currentParticipant.team_members && currentParticipant.team_members.length > 0 && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="p-4 border-b border-orange-200">
                        <h5 className="font-semibold text-orange-900 flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Team Members ({currentParticipant.team_members.length})
                        </h5>
                      </div>
                      <div className="divide-y divide-orange-200">
                        {currentParticipant.team_members.map((member, index) => (
                          <div key={index} className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="font-semibold text-gray-900">{member.name}</div>
                                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mt-2">
                                  <div>
                                    <p>Enrollment: <span className="font-mono">{member.enrollment_no}</span></p>
                                    <p>Department: {member.department}</p>
                                  </div>
                                  <div>
                                    <p>Email: {member.email}</p>
                                    <p>Phone: {member.phone}</p>
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => markAttendance(index)}
                                disabled={isProcessing}
                                className="ml-4 px-4 py-2 bg-green-100 text-green-700 hover:bg-green-200 border border-green-200 rounded-lg font-medium transition-colors disabled:opacity-50"
                              >
                                {isProcessing ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                                ) : (
                                  'Mark Present'
                                )}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <p><span className="font-medium">Name:</span> {currentParticipant.student?.name || currentParticipant.faculty?.name || currentParticipant.name}</p>
                  <p><span className="font-medium">ID:</span> {currentParticipant.student?.enrollment_no || currentParticipant.faculty?.employee_id || currentParticipant.user_id}</p>
                  <p><span className="font-medium">Department:</span> {currentParticipant.student?.department || currentParticipant.faculty?.department || currentParticipant.department}</p>
                  <p><span className="font-medium">Email:</span> {currentParticipant.student?.email || currentParticipant.faculty?.email || currentParticipant.email}</p>
                  <p><span className="font-medium">Phone:</span> {currentParticipant.student?.phone || currentParticipant.faculty?.phone || currentParticipant.phone}</p>
                  <p><span className="font-medium">Registration ID:</span> {currentParticipant.registration_id}</p>
                  <p><span className="font-medium">User Type:</span> {currentParticipant.user_type}</p>
                </div>
              )}
            </div>

            {/* Event Information */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h5 className="font-semibold text-gray-900 mb-2">Event Details</h5>
              <div className="text-sm text-gray-700 space-y-1">
                <p>Event: {currentParticipant.event_name}</p>
                {currentParticipant.event?.date && <p>Date: {currentParticipant.event.date}</p>}
                {currentParticipant.event?.time && <p>Time: {currentParticipant.event.time}</p>}
                {currentParticipant.event?.venue && <p>Venue: {currentParticipant.event.venue}</p>}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowParticipantModal(false);
                  setCurrentParticipant(null);
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
              
              {/* Only show Mark Attendance button for individual registrations */}
              {currentParticipant.type !== 'team' && (
                <button
                  onClick={() => markAttendance()}
                  disabled={isProcessing}
                  className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Marking...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Mark Attendance
                    </>
                  )}
                </button>
              )}
              
              {/* For team registrations, show instruction */}
              {currentParticipant.type === 'team' && (
                <div className="text-sm text-gray-600 italic">
                  Use individual "Mark Present" buttons above for each team member
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Success Modal - "Mark Another" functionality */}
      <Modal
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          setAttendanceResult(null);
          setCurrentParticipant(null);
        }}
        title="Attendance Marked Successfully!"
        size="md"
        headerIcon={<CheckCircle className="w-5 h-5 text-green-600" />}
      >
        {attendanceResult && (
          <div className="space-y-6">
            {/* Success Message */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-green-600" />
                <div>
                  <h4 className="font-semibold text-green-800">Attendance Successfully Marked!</h4>
                  <p className="text-sm text-green-700 mt-1">
                    {attendanceResult.participant?.name} has been marked as present
                    {attendanceResult.member_index !== null && attendanceResult.member_index !== undefined && 
                      ` (Team Member ${attendanceResult.member_index === 'leader' ? 'Leader' : attendanceResult.member_index + 1})`
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Participant Summary */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h5 className="font-semibold text-gray-900 mb-2">Marked Present</h5>
              <div className="text-sm text-gray-700 space-y-1">
                <p><span className="font-medium">Name:</span> {attendanceResult.participant?.name}</p>
                <p><span className="font-medium">ID:</span> {attendanceResult.participant?.enrollment || attendanceResult.participant?.student_id}</p>
                <p><span className="font-medium">Department:</span> {attendanceResult.participant?.department}</p>
                <p><span className="font-medium">Time:</span> {new Date(attendanceResult.timestamp).toLocaleTimeString()}</p>
                <p><span className="font-medium">Marked By:</span> {volunteerInfo.name}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-center">
              <button
                onClick={async () => {
                  setShowSuccessModal(false);
                  setAttendanceResult(null);
                  setCurrentParticipant(null);
                  // Restart scanner for next scan
                  setLastResult('');
                  setScanResult(null);
                  
                  // Wait a moment then reinitialize the scanner
                  setTimeout(() => {
                    initializeScanner();
                  }, 500);
                }}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                <QrCode className="w-4 h-4" />
                Mark Another Participant
              </button>
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  setAttendanceResult(null);
                  setCurrentParticipant(null);
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default UnifiedQRScanner;
