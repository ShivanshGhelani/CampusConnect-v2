import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import qrCodeService from '../../services/QRCodeService';

const QRScanner = ({ isOpen, onClose, onScan, onError }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);
  const [error, setError] = useState('');
  const [cameraPermission, setCameraPermission] = useState('unknown'); // 'granted', 'denied', 'unknown'
  const scannerRef = useRef(null);
  const html5QrcodeScannerRef = useRef(null);

  // Initialize scanner when modal opens
  useEffect(() => {
    if (isOpen && !html5QrcodeScannerRef.current) {
      initializeScanner();
    }
    
    return () => {
      if (html5QrcodeScannerRef.current) {
        html5QrcodeScannerRef.current.clear().catch(console.error);
      }
    };
  }, [isOpen]);

  const initializeScanner = async () => {
    try {
      // Check for camera permission
      if (navigator.permissions) {
        const permission = await navigator.permissions.query({ name: 'camera' });
        setCameraPermission(permission.state);
        
        permission.onchange = () => {
          setCameraPermission(permission.state);
        };
      }

      // Configure scanner for mobile-first design
      const config = {
        fps: 10,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          // Make QR box responsive
          const minEdgePercentage = 0.6; // 60% of the smaller edge
          const minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
          const qrboxSize = Math.floor(minEdgeSize * minEdgePercentage);
          return {
            width: Math.min(qrboxSize, 300),
            height: Math.min(qrboxSize, 300)
          };
        },
        aspectRatio: 1.0,
        disableFlip: false,
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA]
      };

      html5QrcodeScannerRef.current = new Html5QrcodeScanner(
        "qr-reader",
        config,
        /* verbose= */ false
      );

      html5QrcodeScannerRef.current.render(onScanSuccess, onScanFailure);
      setIsScanning(true);
      
    } catch (err) {
      
      setError('Failed to initialize camera scanner. Please check camera permissions.');
    }
  };

  const onScanSuccess = async (decodedText, decodedResult) => {
    try {
      // Parse QR code data
      const qrData = qrCodeService.parseQRData(decodedText);
      
      if (!qrData) {
        setError('Invalid QR code format. Please scan a valid event registration QR code.');
        return;
      }

      setScanResult(qrData);
      
      // Simulate fetching attendance data from backend
      const mockAttendanceData = await simulateAttendanceDataFetch(qrData);
      setAttendanceData(mockAttendanceData);
      
      // Pause scanning after successful scan
      if (html5QrcodeScannerRef.current) {
        html5QrcodeScannerRef.current.pause();
        setIsScanning(false);
      }
      
      // DON'T call onScan here - wait for volunteer to mark attendance and click Save
      
    } catch (error) {
      
      setError('Error processing QR code. Please try again.');
    }
  };

  const onScanFailure = (error) => {
    // Don't show errors for scan failures - they're too frequent
    // 
  };

  // Simulate fetching attendance data with realistic timing
  const simulateAttendanceDataFetch = async (qrData) => {
    // Show loading state
    await new Promise(resolve => setTimeout(resolve, 800));
    
    if (qrData.type === 'team') {
      return {
        event_id: qrData.event_id,
        event_name: qrData.event_name,
        team_id: qrData.team?.team_id,
        team_name: qrData.team?.name,
        registration_id: qrData.reg_id,
        scan_time: new Date().toISOString(),
        leader: {
          ...qrData.leader,
          attendance_status: Math.random() > 0.5 ? 'present' : 'pending',
          marked_at: Math.random() > 0.5 ? new Date(Date.now() - Math.random() * 3600000).toISOString() : null,
          marked_by: Math.random() > 0.5 ? 'organizer_001' : null
        },
        members: qrData.team?.members?.map(member => ({
          ...member,
          attendance_status: Math.random() > 0.6 ? 'present' : 'pending',
          marked_at: Math.random() > 0.6 ? new Date(Date.now() - Math.random() * 3600000).toISOString() : null,
          marked_by: Math.random() > 0.6 ? 'organizer_001' : null
        })) || []
      };
    } else {
      // Individual registration
      return {
        event_id: qrData.event_id,
        event_name: qrData.event_name,
        registration_id: qrData.reg_id,
        scan_time: new Date().toISOString(),
        student: {
          ...qrData.leader,
          attendance_status: 'pending'
        }
      };
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
    // Call parent's onScan callback with updated attendance data
    if (onScan && scanResult && attendanceData) {
      onScan(scanResult, attendanceData);
    }
    
    // Reset for next scan
    handleReset();
  };

  const handleReset = () => {
    setScanResult(null);
    setAttendanceData(null);
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
                    <div className="text-2xl font-bold text-blue-600">{getPresentCount()}/{getTotalCount()}</div>
                    <div className="text-sm text-gray-600">Present</div>
                  </div>
                </div>
              </div>

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
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save Attendance ({getPresentCount()}/{getTotalCount()})
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
