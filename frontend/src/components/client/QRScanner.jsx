import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import qrCodeService from '../../services/QRCodeService';
import api from '../../api/base'; // For backend API calls

const QRScanner = ({ isOpen, onClose, onScan, onError }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);
  const [error, setError] = useState('');
  const [cameraPermission, setCameraPermission] = useState('unknown'); // 'granted', 'denied', 'unknown'
  const [selectedDay, setSelectedDay] = useState(null); // For day-based attendance
  const [selectedSession, setSelectedSession] = useState(null); // For session-based attendance
  const scannerRef = useRef(null);
  const html5QrcodeScannerRef = useRef(null);

  // Initialize scanner when modal opens
  useEffect(() => {
    console.log('📱 QRScanner modal state changed. isOpen:', isOpen);
    console.log('📱 Scanner ref exists:', !!html5QrcodeScannerRef.current);
    
    if (isOpen && !html5QrcodeScannerRef.current) {
      console.log('🚀 Starting scanner initialization...');
      initializeScanner();
    }
    
    return () => {
      if (html5QrcodeScannerRef.current) {
        console.log('🧹 Cleaning up scanner...');
        html5QrcodeScannerRef.current.clear().catch(console.error);
      }
    };
  }, [isOpen]);

  const initializeScanner = async () => {
    console.log('🎥 INITIALIZING QR SCANNER...');
    try {
      // Check for camera permission
      if (navigator.permissions) {
        const permission = await navigator.permissions.query({ name: 'camera' });
        console.log('📹 Camera permission status:', permission.state);
        setCameraPermission(permission.state);
        
        permission.onchange = () => {
          console.log('📹 Camera permission changed to:', permission.state);
          setCameraPermission(permission.state);
        };
      }

      // Configure scanner for better detection - IMPROVED SETTINGS
      const config = {
        fps: 20, // Increased from 10 to 20 for faster scanning
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          // Make QR box more forgiving - larger scanning area
          const minEdgePercentage = 0.7; // Increased from 0.6 to 0.7 (70% of screen)
          const minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
          const qrboxSize = Math.floor(minEdgeSize * minEdgePercentage);
          return {
            width: Math.min(qrboxSize, 350), // Increased from 300 to 350
            height: Math.min(qrboxSize, 350)
          };
        },
        aspectRatio: 1.0,
        disableFlip: false,
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
        showTorchButtonIfSupported: true, // Enable flashlight if available
        formatsToSupport: [Html5QrcodeScannerState.QR_CODE] // Only scan QR codes
      };

      console.log('📋 Scanner config:', config);
      console.log('🎯 Creating Html5QrcodeScanner instance...');
      
      html5QrcodeScannerRef.current = new Html5QrcodeScanner(
        "qr-reader",
        config,
        /* verbose= */ false
      );

      console.log('✅ Scanner instance created, rendering...');
      html5QrcodeScannerRef.current.render(onScanSuccess, onScanFailure);
      setIsScanning(true);
      console.log('✅ Scanner rendered and active!');
      
    } catch (err) {
      console.error('❌ Scanner initialization error:', err);
      setError('Failed to initialize camera scanner. Please check camera permissions.');
    }
  };

  const onScanSuccess = async (decodedText, decodedResult) => {
    console.log('🎯 QR CODE SCANNED!');
    console.log('Raw decoded text:', decodedText);
    
    try {
      // Parse QR code data
      const qrData = qrCodeService.parseQRData(decodedText);
      console.log('Parsed QR data:', qrData);
      
      if (!qrData) {
        console.error('❌ parseQRData returned null - invalid format');
        setError('Invalid QR code format. Please scan a valid event registration QR code.');
        return;
      }

      console.log('✅ Valid QR data, setting scan result...');
      setScanResult(qrData);
      
      // Fetch REAL attendance data from backend
      console.log('📡 Fetching REAL attendance data from backend...');
      const realAttendanceData = await fetchRealAttendanceData(qrData);
      setAttendanceData(realAttendanceData);
      console.log('✅ Got real attendance data:', realAttendanceData);
      
      // Pause scanning after successful scan
      if (html5QrcodeScannerRef.current) {
        html5QrcodeScannerRef.current.pause();
        setIsScanning(false);
      }
      
      // DON'T call onScan here - wait for volunteer to mark attendance and click Save
      console.log('✅ Attendance UI should now be visible');
      
    } catch (error) {
      console.error('❌ ERROR in onScanSuccess:', error);
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack);
      setError(`Error processing QR code: ${error.message}`);
    }
  };

  const onScanFailure = (error) => {
    // Only log non-routine scan failures
    if (error && !error.includes('NotFoundException')) {
      console.log('⚠️ Scan attempt failed:', error);
    }
  };

  // Fetch real attendance data from backend API
  const fetchRealAttendanceData = async (qrData) => {
    console.log('📦 Fetching REAL attendance data for:', qrData);
    
    const registration_id = qrData.registration_id || qrData.reg_id;
    
    if (!registration_id) {
      throw new Error('No registration_id found in QR code');
    }
    
    try {
      // Call the NEW backend endpoint that returns real data
      const response = await api.get(`/api/scanner/registration/${registration_id}/status`);
      
      console.log('Backend response:', response.data);
      
      if (response.data.success) {
        const data = response.data.data;
        
        // Format data for UI - matches expected structure
        const formattedData = {
          event_id: data.event_id,
          event_name: data.event_name,
          registration_id: data.registration_id,
          registration_type: data.registration_type,
          attendance_strategy: data.attendance_strategy,
          scan_time: new Date().toISOString(),
          attendance: data.attendance || {},
        };
        
        // Add student/faculty/team data based on type
        if (data.registration_type === 'individual') {
          formattedData.student = data.student || data.faculty || null;
        } else if (data.registration_type === 'team') {
          formattedData.team_name = data.team_name;
          formattedData.leader = data.leader;
          formattedData.members = data.team_members || [];
        }
        
        return formattedData;
      } else {
        throw new Error(response.data.error || 'Failed to fetch attendance data');
      }
    } catch (error) {
      console.error('❌ Error fetching real attendance data:', error);
      throw new Error(`Failed to fetch attendance: ${error.message}`);
    }
  };

  const handleAttendanceToggle = (memberId, memberType = 'member') => {
    if (!attendanceData) return;

    const updatedData = { ...attendanceData };
    
    if (memberType === 'leader') {
      const currentStatus = updatedData.leader.attendance_status;
      updatedData.leader.attendance_status = currentStatus === 'present' ? 'pending' : 'present';
      updatedData.leader.marked_at = currentStatus === 'present' ? null : new Date().toISOString();
      updatedData.leader.marked_by = currentStatus === 'present' ? null : 'organizer_current';
    } else if (memberType === 'individual') {
      const currentStatus = updatedData.student.attendance_status;
      updatedData.student.attendance_status = currentStatus === 'present' ? 'pending' : 'present';
      updatedData.student.marked_at = currentStatus === 'present' ? null : new Date().toISOString();
      updatedData.student.marked_by = currentStatus === 'present' ? null : 'organizer_current';
    } else {
      const memberIndex = updatedData.members?.findIndex(m => m.id === memberId);
      if (memberIndex !== -1) {
        const currentStatus = updatedData.members[memberIndex].attendance_status;
        updatedData.members[memberIndex].attendance_status = currentStatus === 'present' ? 'pending' : 'present';
        updatedData.members[memberIndex].marked_at = currentStatus === 'present' ? null : new Date().toISOString();
        updatedData.members[memberIndex].marked_by = currentStatus === 'present' ? null : 'organizer_current';
      }
    }

    setAttendanceData(updatedData);
  };

  const handleSaveAttendance = () => {
    // Enhanced attendance data with day/session info
    const enhancedAttendanceData = {
      ...attendanceData,
      // Add selected day/session for backend
      day: selectedDay,
      session_id: selectedSession
    };
    
    // Call parent's onScan callback with updated attendance data
    if (onScan && scanResult && enhancedAttendanceData) {
      onScan(scanResult, enhancedAttendanceData);
    }
    
    // Reset for next scan
    handleReset();
  };

  const handleReset = () => {
    setScanResult(null);
    setAttendanceData(null);
    setSelectedDay(null);
    setSelectedSession(null);
    setError('');
    
    // Resume scanning
    if (html5QrcodeScannerRef.current) {
      html5QrcodeScannerRef.current.resume();
      setIsScanning(true);
    }
  };

  const handleClose = () => {
    if (html5QrcodeScannerRef.current) {
      html5QrcodeScannerRef.current.clear().catch(console.error);
      html5QrcodeScannerRef.current = null;
    }
    setScanResult(null);
    setAttendanceData(null);
    setError('');
    setIsScanning(false);
    onClose();
  };

  const getPresentCount = () => {
    if (!attendanceData) return 0;
    
    let count = 0;
    if (attendanceData.leader?.attendance_status === 'present') count++;
    if (attendanceData.student?.attendance_status === 'present') count++;
    count += attendanceData.members?.filter(m => m.attendance_status === 'present').length || 0;
    return count;
  };

  const getTotalCount = () => {
    if (!attendanceData) return 0;
    if (attendanceData.student) return 1; // Individual registration
    return 1 + (attendanceData.members?.length || 0); // Team: leader + members
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-2 z-50">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[95vh] overflow-y-auto">
        {/* Mobile-optimized Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 rounded-t-xl">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">QR Scanner</h2>
                <p className="text-sm text-gray-600">Scan registration QR codes</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-4">
          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-red-800">Scan Error</p>
                  <p className="text-sm text-red-700">{error}</p>
                  <button
                    onClick={() => setError('')}
                    className="mt-2 text-xs text-red-600 underline"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Camera Permission Warning */}
          {cameraPermission === 'denied' && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-yellow-800">Camera Access Required</p>
                  <p className="text-sm text-yellow-700">Please allow camera access to scan QR codes.</p>
                </div>
              </div>
            </div>
          )}

          {/* Scanner Area */}
          {!attendanceData && (
            <div className="mb-4">
              <div 
                id="qr-reader" 
                className="w-full rounded-lg overflow-hidden bg-gray-100"
                style={{ minHeight: '300px' }}
              ></div>
              
              {isScanning && (
                <div className="mt-3 flex items-center justify-center gap-2 text-sm text-gray-600">
                  <div className="animate-pulse w-2 h-2 bg-blue-600 rounded-full"></div>
                  <span>Position QR code within the frame to scan</span>
                </div>
              )}
            </div>
          )}

          {/* Scan Result & Attendance Interface */}
          {attendanceData && (
            <div className="space-y-4">
              {/* Event Info Header */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{attendanceData.team_name || attendanceData.event_name}</h3>
                    <p className="text-gray-700">{attendanceData.event_name}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Scanned at {new Date(attendanceData.scan_time).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200">
                      {attendanceData.registration_type || 'individual'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Day/Session Selection - CRITICAL FOR DAY-BASED ATTENDANCE */}
              {attendanceData.attendance_strategy === 'day_based' && attendanceData.attendance?.days && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Select Day to Mark
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {attendanceData.attendance.days.map((day) => {
                      const isAlreadyMarked = day.marked;
                      const isSelected = selectedDay === day.day;
                      
                      return (
                        <button
                          key={day.day}
                          onClick={() => setSelectedDay(isSelected ? null : day.day)}
                          disabled={isAlreadyMarked}
                          className={`
                            px-4 py-3 rounded-lg font-medium transition-all text-left
                            ${isAlreadyMarked 
                              ? 'bg-green-100 text-green-800 border-2 border-green-300 cursor-not-allowed opacity-75' 
                              : isSelected
                                ? 'bg-blue-600 text-white border-2 border-blue-700 shadow-lg'
                                : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                            }
                          `}
                        >
                          <div className="flex items-center justify-between">
                            <span>Day {day.day}</span>
                            {isAlreadyMarked && (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                            {isSelected && !isAlreadyMarked && (
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="8"/>
                              </svg>
                            )}
                          </div>
                          {isAlreadyMarked && day.marked_at && (
                            <div className="text-xs mt-1 opacity-75">
                              Marked {new Date(day.marked_at).toLocaleDateString()}
                            </div>
                          )}
                          {day.date && !isAlreadyMarked && (
                            <div className="text-xs mt-1 opacity-75">
                              {new Date(day.date).toLocaleDateString()}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {!selectedDay && (
                    <p className="text-sm text-blue-700 mt-2 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Please select a day to mark attendance
                    </p>
                  )}
                </div>
              )}

              {/* Session Selection - FOR SESSION-BASED ATTENDANCE */}
              {attendanceData.attendance_strategy === 'session_based' && attendanceData.attendance?.sessions && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h4 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Select Session to Mark
                  </h4>
                  <div className="space-y-2">
                    {attendanceData.attendance.sessions.map((session) => {
                      const isAlreadyMarked = session.marked;
                      const isSelected = selectedSession === session.session_id;
                      
                      return (
                        <button
                          key={session.session_id}
                          onClick={() => setSelectedSession(isSelected ? null : session.session_id)}
                          disabled={isAlreadyMarked}
                          className={`
                            w-full px-4 py-3 rounded-lg font-medium transition-all text-left
                            ${isAlreadyMarked 
                              ? 'bg-green-100 text-green-800 border-2 border-green-300 cursor-not-allowed opacity-75' 
                              : isSelected
                                ? 'bg-purple-600 text-white border-2 border-purple-700 shadow-lg'
                                : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-purple-400 hover:bg-purple-50'
                            }
                          `}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{session.session_name || `Session ${session.session_id}`}</div>
                              {session.session_time && (
                                <div className="text-sm opacity-75 mt-1">
                                  {new Date(session.session_time).toLocaleString()}
                                </div>
                              )}
                            </div>
                            {isAlreadyMarked && (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          {isAlreadyMarked && session.marked_at && (
                            <div className="text-xs mt-1 opacity-75">
                              Marked by {session.marked_by} on {new Date(session.marked_at).toLocaleString()}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {!selectedSession && (
                    <p className="text-sm text-purple-700 mt-2 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Please select a session to mark attendance
                    </p>
                  )}
                </div>
              )}

              {/* Individual Student (for individual registrations) */}
              {attendanceData.student && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-medium text-gray-900">{attendanceData.student.name}</h4>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                          attendanceData.student.attendance_status === 'present' 
                            ? 'bg-green-100 text-green-800 border border-green-200' 
                            : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                        }`}>
                          {attendanceData.student.attendance_status === 'present' ? (
                            <>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Present
                            </>
                          ) : (
                            <>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Pending
                            </>
                          )}
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-600">
                        <p>Enrollment: <span className="font-mono">{attendanceData.student.enrollment}</span></p>
                        <p>Department: {attendanceData.student.department}</p>
                        <p>Registration ID: <span className="font-mono">{attendanceData.registration_id}</span></p>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleAttendanceToggle(null, 'individual')}
                      className={`ml-4 px-4 py-2 rounded-lg font-medium transition-colors ${
                        attendanceData.student.attendance_status === 'present'
                          ? 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-200'
                      }`}
                    >
                      {attendanceData.student.attendance_status === 'present' ? 'Mark Absent' : 'Mark Present'}
                    </button>
                  </div>
                </div>
              )}

              {/* Team Leader */}
              {attendanceData.leader && (
                <div className="bg-white border border-gray-200 rounded-lg">
                  <div className="bg-purple-50 px-4 py-3 border-b border-purple-200 rounded-t-lg">
                    <h4 className="font-semibold text-purple-900 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Team Leader
                    </h4>
                  </div>
                  
                  <div className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                          <h5 className="font-medium text-gray-900">{attendanceData.leader.name}</h5>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium self-start ${
                            attendanceData.leader.attendance_status === 'present' 
                              ? 'bg-green-100 text-green-800 border border-green-200' 
                              : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                          }`}>
                            {attendanceData.leader.attendance_status === 'present' ? (
                              <>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Present
                              </>
                            ) : (
                              <>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Pending
                              </>
                            )}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
                          <div>
                            <p>Enrollment: <span className="font-mono">{attendanceData.leader.enrollment}</span></p>
                            <p>Department: {attendanceData.leader.department}</p>
                          </div>
                          <div>
                            <p>Email: {attendanceData.leader.email}</p>
                            {attendanceData.leader.marked_at && (
                              <p>Marked: {new Date(attendanceData.leader.marked_at).toLocaleTimeString()}</p>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleAttendanceToggle(null, 'leader')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors self-start ${
                          attendanceData.leader.attendance_status === 'present'
                            ? 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-200'
                        }`}
                      >
                        {attendanceData.leader.attendance_status === 'present' ? 'Mark Absent' : 'Mark Present'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Team Members */}
              {attendanceData.members && attendanceData.members.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg">
                  <div className="bg-orange-50 px-4 py-3 border-b border-orange-200 rounded-t-lg">
                    <h4 className="font-semibold text-orange-900 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      Team Members ({attendanceData.members.length})
                    </h4>
                  </div>
                  
                  <div className="divide-y divide-gray-200">
                    {attendanceData.members.map((member, index) => (
                      <div key={member.id} className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium text-gray-600 flex-shrink-0">
                                  {index + 1}
                                </span>
                                <h5 className="font-medium text-gray-900">{member.name}</h5>
                              </div>
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium self-start ${
                                member.attendance_status === 'present' 
                                  ? 'bg-green-100 text-green-800 border border-green-200' 
                                  : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                              }`}>
                                {member.attendance_status === 'present' ? (
                                  <>
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Present
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Pending
                                  </>
                                )}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
                              <div>
                                <p>Enrollment: <span className="font-mono">{member.enrollment}</span></p>
                                <p>Department: {member.department}</p>
                              </div>
                              <div>
                                <p>Year: {member.year || 'N/A'}</p>
                                {member.marked_at && (
                                  <p>Marked: {new Date(member.marked_at).toLocaleTimeString()}</p>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <button
                            onClick={() => handleAttendanceToggle(member.id)}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors self-start ${
                              member.attendance_status === 'present'
                                ? 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-200'
                                : 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-200'
                            }`}
                          >
                            {member.attendance_status === 'present' ? 'Mark Absent' : 'Mark Present'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  onClick={handleSaveAttendance}
                  disabled={
                    (attendanceData.attendance_strategy === 'day_based' && !selectedDay) ||
                    (attendanceData.attendance_strategy === 'session_based' && !selectedSession)
                  }
                  className={`
                    flex-1 px-6 py-3 rounded-lg transition-colors font-medium flex items-center justify-center gap-2
                    ${(attendanceData.attendance_strategy === 'day_based' && !selectedDay) ||
                      (attendanceData.attendance_strategy === 'session_based' && !selectedSession)
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                    }
                  `}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {attendanceData.attendance_strategy === 'day_based' && selectedDay
                    ? `Mark Attendance for Day ${selectedDay}`
                    : attendanceData.attendance_strategy === 'session_based' && selectedSession
                    ? 'Mark Attendance for Session'
                    : attendanceData.attendance_strategy === 'single_mark'
                    ? 'Mark Attendance'
                    : 'Select Day/Session First'
                  }
                </button>
                
                <button
                  onClick={handleReset}
                  className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Scan Another QR
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QRScanner;
